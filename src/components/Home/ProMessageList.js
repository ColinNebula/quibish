import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
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
import './MessagePositionStyles.css';
import ScrollToBottom from './ScrollToBottom';
import MessageSkeleton from './MessageSkeleton';
import VoiceMessage from './VoiceMessage';
import PinnedMessages from './PinnedMessages';
import JumpToLatest from './JumpToLatest';
import EditableMessage from './EditableMessage';
import CodeBlock from './CodeBlock';
import MessageThread from './MessageThread';
import MessageReactions from './MessageReactions';

const ProMessageList = ({ messages, currentUser, messagesEndRef, searchQuery, onImageClick }) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reactionMenuOpen, setReactionMenuOpen] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(null);
  const [showVoiceMessage, setShowVoiceMessage] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(2);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [activeThread, setActiveThread] = useState(null);
  
  // Enhanced state for performance and UX
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [messageHeights, setMessageHeights] = useState(new Map());
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [imageLoadStates, setImageLoadStates] = useState({});
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  
  // Virtualization refs
  const listRef = useRef(null);
  const itemHeightCache = useRef(new Map());
  
  // Memoized processed messages for better performance
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    return messages.map((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const shouldGroup = previousMessage && 
        previousMessage.sender?.id === message.sender?.id &&
        (new Date(message.timestamp) - new Date(previousMessage.timestamp)) < 5 * 60 * 1000; // 5 minutes
      
      return {
        ...message,
        index,
        shouldGroup,
        previousMessage,
        isHighlighted: searchQuery && 
          message.content?.toLowerCase().includes(searchQuery.toLowerCase())
      };
    });
  }, [messages, searchQuery]);
  
  // Enhanced message reactions state
  const [messageReactions, setMessageReactions] = useState({
    1: [
      { emoji: '👍', userId: 'user-1', username: 'Alice', timestamp: new Date().toISOString() },
      { emoji: '❤️', userId: 'user-2', username: 'Bob', timestamp: new Date().toISOString() }
    ],
    2: [
      { emoji: '😂', userId: 'user-3', username: 'Charlie', timestamp: new Date().toISOString() }
    ],
    3: [
      { emoji: '👍', userId: 'user-1', username: 'Alice', timestamp: new Date().toISOString() },
      { emoji: '👍', userId: 'user-4', username: 'Dave', timestamp: new Date().toISOString() },
      { emoji: '🎉', userId: 'user-2', username: 'Bob', timestamp: new Date().toISOString() }
    ]
  });
  
  const [attachmentReactions, setAttachmentReactions] = useState({});
  const [codeBlocksExpanded, setCodeBlocksExpanded] = useState({});
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [lastReadTimestamp, setLastReadTimestamp] = useState(new Date(Date.now() - 15 * 60 * 1000).toISOString());
  const [readReceipts, setReadReceipts] = useState([
    { name: 'Jane Smith', url: 'https://via.placeholder.com/40' },
    { name: 'Robert Johnson', url: 'https://via.placeholder.com/40' },
    { name: 'Alex Weber', url: 'https://via.placeholder.com/40' },
    { name: 'Sarah Kim', url: 'https://via.placeholder.com/40' }
  ]);
  
  // Enhanced references for virtualization and scroll functionality
  const messageListRef = useRef(null);
  const virtualListRef = useRef(null);
  const [focusedMessageId, setFocusedMessageId] = useState(null);
  
  // Dynamic height calculation for virtualization
  const getItemHeight = useCallback((index) => {
    const cached = itemHeightCache.current.get(index);
    if (cached) return cached;
    
    const message = processedMessages[index];
    if (!message) return 120; // Default height
    
    let height = message.shouldGroup ? 60 : 80; // Base height with/without header
    
    // Add height for content
    if (message.content) {
      const lineCount = Math.ceil(message.content.length / 60);
      height += lineCount * 20;
    }
    
    // Add height for attachments
    if (message.attachments && message.attachments.length > 0) {
      const hasImages = message.attachments.some(a => a.type === 'image');
      height += hasImages ? 250 : 60;
    }
    
    // Add height for reactions
    const reactions = messageReactions[message.id];
    if (reactions && reactions.length > 0) {
      height += 40;
    }
    
    itemHeightCache.current.set(index, height);
    return height;
  }, [processedMessages, messageReactions]);
  
  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (virtualListRef.current && processedMessages.length > 0) {
      virtualListRef.current.scrollToItem(processedMessages.length - 1, 'end');
    }
  }, [processedMessages.length]);
  
  // Handle scroll position tracking
  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }) => {
    setScrollPosition(scrollTop);
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 100);
  }, []);

  // Keyboard navigation: Up/Down to move selection, Enter to toggle selection
  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;

    const onKeyDown = (e) => {
      const visibleMessages = Array.from(el.querySelectorAll('.pro-message-container'));
      if (visibleMessages.length === 0) return;

      const ids = visibleMessages.map(m => m.id.replace('message-', '')).map(id => parseInt(id, 10));
      const currentIndex = focusedMessageId ? ids.indexOf(Number(focusedMessageId)) : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, ids.length - 1);
        const nextId = ids[nextIndex];
        if (nextId !== undefined) {
          setFocusedMessageId(nextId);
          const target = document.getElementById(`message-${nextId}`);
          target?.focus();
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevId = ids[prevIndex];
        if (prevId !== undefined) {
          setFocusedMessageId(prevId);
          const target = document.getElementById(`message-${prevId}`);
          target?.focus();
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (e.key === 'Enter') {
        // Toggle selection of focused message
        if (focusedMessageId) {
          const id = Number(focusedMessageId);
          handleMessageClick(id);
        }
      }
    };

    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [focusedMessageId, messageListRef, handleMessageClick]);
  
  // Sample pinned messages for demo
  useEffect(() => {
    if (messages.length > 0) {
      // Pin a couple messages for demo purposes
      const samplePinned = [
        messages[2], // Third message
        messages[messages.length - 3] // Third from last
      ].filter(Boolean);
      
      setPinnedMessages(samplePinned);
    }
  }, [messages]);
  
  // Common reactions
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏'];
  
  // Function to format message timestamps
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };
  
  // Handle message selection
  const handleMessageClick = useCallback((messageId) => {
    setSelectedMessage(messageId === selectedMessage ? null : messageId);
    // Close reaction menu if open
    if (reactionMenuOpen) setReactionMenuOpen(null);
  }, [selectedMessage, reactionMenuOpen]);
  
  // Toggle reaction menu
  const toggleReactionMenu = useCallback((e, messageId) => {
    e.stopPropagation(); // Prevent message selection
    handleOpenReactionPicker(e, messageId);
  }, []);
  
  // Add reaction to message
  const addReaction = useCallback((e, messageId, reaction) => {
    e.stopPropagation(); // Prevent message selection
    handleReaction(messageId, reaction);
    setReactionMenuOpen(null);
  }, []);
  
  // Function to format dates for date separators
  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };
  
  // Function to determine if a new date separator is needed
  const needsDateSeparator = (currentMessage, prevMessage) => {
    if (!prevMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp).toDateString();
    const prevDate = new Date(prevMessage.timestamp).toDateString();
    
    return currentDate !== prevDate;
  };
  
  // Jump to the latest messages
  const jumpToLatest = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Reset unread count in a real app
    setUnreadCount(0);
  };
  
  // Pin/unpin a message
  const togglePinMessage = (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    // Check if already pinned
    const isPinned = pinnedMessages.some(m => m.id === messageId);
    
    if (isPinned) {
      setPinnedMessages(pinnedMessages.filter(m => m.id !== messageId));
    } else {
      setPinnedMessages([...pinnedMessages, message]);
    }
  };
  
  // Code block rendering
  const renderCodeBlock = (message) => {
    // Extract code blocks from message content
    const regex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    // Process each code block in the message
    while ((match = regex.exec(message.content)) !== null) {
      // Add text before this code block
      if (match.index > lastIndex) {
        parts.push(message.content.substring(lastIndex, match.index));
      }
      
      // Extract language and code
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      
      // Add code block component
      parts.push(
        <CodeBlock 
          key={`${message.id}-code-${parts.length}`}
          code={code}
          language={language}
          isExpanded={codeBlocksExpanded[`${message.id}-${parts.length}`]}
          messageId={message.id}
        />
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last code block
    if (lastIndex < message.content.length) {
      parts.push(message.content.substring(lastIndex));
    }
    
    return parts;
  };
  
  // Handle message reactions
  const handleReaction = (messageId, emoji) => {
    setMessageReactions(prev => {
      const currentReactions = prev[messageId] || [];
      const existingReactionIndex = currentReactions.findIndex(r => r.emoji === emoji && r.userId === 'current-user');
      
      if (existingReactionIndex !== -1) {
        // Remove user's reaction
        return {
          ...prev,
          [messageId]: currentReactions.filter((_, index) => index !== existingReactionIndex)
        };
      } else {
        // Add user's reaction
        return {
          ...prev,
          [messageId]: [
            ...currentReactions,
            {
              emoji,
              userId: 'current-user',
              username: 'You',
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
    });
  };
  
  // Handle opening reaction picker
  const handleOpenReactionPicker = (event, messageId) => {
    // Toggle the reaction menu for this message
    setReactionMenuOpen(messageId === reactionMenuOpen ? null : messageId);
  };
  
  // Handle thread replies
  const handleThreadReply = (threadId, content) => {
    console.log('Reply to thread', threadId, content);
    // In a real app, you'd update state with the new reply
    // and potentially make an API call
    
    // Toggle thread expanded state
    setExpandedThreads(prev => ({
      ...prev,
      [threadId]: true // Ensure thread is expanded after reply
    }));
  };
  
  // Toggle thread expanded state
  const toggleThreadExpanded = (threadId) => {
    setExpandedThreads(prev => ({
      ...prev,
      [threadId]: !prev[threadId]
    }));
  };
  
  // Translate message
  const translateMessage = (messageId, fromLanguage) => {
    // In a real app, you would call a translation API
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    // Demo translation (just a placeholder)
    const translatedText = `This is a translated version of: "${message.content.substring(0, 30)}..."`;
    
    setTranslatedMessages(prev => ({
      ...prev,
      [messageId]: translatedText
    }));
    
    // Provide option to show original
    console.log(`Translated message ${messageId} from ${fromLanguage} to English`);
  };
  
  // Handle editing a message
  const startEditingMessage = (messageId) => {
    setEditingMessageId(messageId);
    // Close any open interaction menus
    setSelectedMessage(null);
    setReactionMenuOpen(null);
  };
  
  // Save edited message
  const saveEditedMessage = (messageId, newContent) => {
    // In a real app, you would update the message on the server
    console.log(`Message ${messageId} edited: ${newContent}`);
    setEditingMessageId(null);
  };
  
  // Cancel message editing
  const cancelEditingMessage = () => {
    setEditingMessageId(null);
  };
  
  // Function to render file attachments
  const renderAttachments = (attachments, messageId) => {
    if (!attachments || attachments.length === 0) return null;

    // Determine grid layout class based on number of attachments
    const getLayoutClass = (count) => {
      if (count === 1) return 'single';
      if (count === 2) return 'double';
      if (count === 3) return 'triple';
      return 'multiple';
    };

    // Handle attachment reactions
    const handleAttachmentReaction = (attachmentId, emoji) => {
      const reactionKey = `${messageId}-${attachmentId}`;
      setAttachmentReactions(prev => {
        const current = prev[reactionKey] || [];
        const existingReaction = current.find(r => r.userId === currentUser?.id && r.emoji === emoji);
        
        if (existingReaction) {
          // Remove reaction
          return {
            ...prev,
            [reactionKey]: current.filter(r => !(r.userId === currentUser?.id && r.emoji === emoji))
          };
        } else {
          // Add reaction
          return {
            ...prev,
            [reactionKey]: [...current, {
              emoji,
              userId: currentUser?.id || 'anonymous',
              username: currentUser?.name || 'Anonymous',
              timestamp: new Date().toISOString()
            }]
          };
        }
      });
    };

    // Render reaction buttons for attachments
    const renderAttachmentReactions = (attachmentId) => {
      const reactionKey = `${messageId}-${attachmentId}`;
      const reactions = attachmentReactions[reactionKey] || [];
      const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

      return (
        <>
          <div className="pro-attachment-reactions">
            <button 
              className={`pro-reaction-button ${reactions.some(r => r.userId === currentUser?.id && r.emoji === '👍') ? 'liked' : ''}`}
              onClick={() => handleAttachmentReaction(attachmentId, '👍')}
              title="Like"
            >
              👍
            </button>
            {reactions.filter(r => r.emoji === '👍').length > 0 && (
              <span className="pro-reaction-count">
                {reactions.filter(r => r.emoji === '👍').length}
              </span>
            )}
            
            <div className="pro-reaction-picker">
              {reactionEmojis.map(emoji => (
                <button
                  key={emoji}
                  className="pro-reaction-option"
                  onClick={() => handleAttachmentReaction(attachmentId, emoji)}
                  data-label={getEmojiLabel(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          {reactions.length > 0 && (
            <div className="pro-attachment-reaction-summary">
              {Object.entries(reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})).map(([emoji, count]) => (
                <div 
                  key={emoji}
                  className={`pro-reaction-badge ${reactions.some(r => r.emoji === emoji && r.userId === currentUser?.id) ? 'my-reaction' : ''}`}
                  onClick={() => handleAttachmentReaction(attachmentId, emoji)}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      );
    };

    // Helper function for emoji labels
    const getEmojiLabel = (emoji) => {
      const labels = {
        '👍': 'Like',
        '❤️': 'Love',
        '😂': 'Laugh',
        '😮': 'Wow',
        '😢': 'Sad',
        '😡': 'Angry'
      };
      return labels[emoji] || emoji;
    };
    
    return (
      <div className={`pro-attachments ${getLayoutClass(attachments.length)}`}>
        {attachments.map(attachment => {
          if (attachment.type === 'image') {
            return (
              <div 
                key={attachment.id} 
                className="pro-image-attachment"
                onClick={() => handleImageClick(attachment, attachments)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleImageClick(attachment, attachments);
                  }
                }}
                aria-label={`View ${attachment.name || 'image'} in full size`}
              >
                <img 
                  src={attachment.url} 
                  alt={attachment.name || 'Shared image'} 
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="pro-image-fallback" style={{ display: 'none' }}>
                  <div className="pro-fallback-icon">🖼️</div>
                  <span>Image failed to load</span>
                </div>
                {(attachment.name || attachment.size) && (
                  <div className="pro-attachment-caption">
                    <span className="pro-attachment-name">{attachment.name}</span>
                    <span className="pro-attachment-size">{attachment.size}</span>
                  </div>
                )}
                {renderAttachmentReactions(attachment.id)}
              </div>
            );
          } else if (attachment.type === 'video') {
            return (
              <div 
                key={attachment.id} 
                className="pro-video-container"
                onClick={() => handleVideoClick(attachment)}
              >
                <video 
                  className="pro-video-player"
                  poster={attachment.thumbnail}
                  preload="metadata"
                >
                  <source src={attachment.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="pro-video-overlay">
                  <div className="pro-video-play-icon">▶️</div>
                </div>
                {attachment.duration && (
                  <div className="pro-video-duration">{attachment.duration}</div>
                )}
                <div className="pro-video-reactions">
                  <button 
                    className={`pro-reaction-button ${attachmentReactions[`${messageId}-${attachment.id}`]?.some(r => r.userId === currentUser?.id && r.emoji === '👍') ? 'liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttachmentReaction(attachment.id, '👍');
                    }}
                    title="Like"
                  >
                    👍
                  </button>
                  {attachmentReactions[`${messageId}-${attachment.id}`]?.filter(r => r.emoji === '👍').length > 0 && (
                    <span className="pro-reaction-count">
                      {attachmentReactions[`${messageId}-${attachment.id}`].filter(r => r.emoji === '👍').length}
                    </span>
                  )}
                </div>
                {(attachment.name || attachment.size) && (
                  <div className="pro-video-caption">
                    <span className="pro-attachment-name">{attachment.name}</span>
                    <span className="pro-attachment-size">{attachment.size}</span>
                  </div>
                )}
                {renderAttachmentReactions(attachment.id)}
              </div>
            );
          } else {
            return (
              <div key={attachment.id} className="pro-file-attachment">
                <div className="pro-file-icon">
                  {attachment.type === 'spreadsheet' ? '📊' : 
                   attachment.type === 'document' ? '📄' : 
                   attachment.type === 'presentation' ? '📑' : 
                   attachment.type === 'pdf' ? '📕' : '📁'}
                </div>
                <div className="pro-file-details">
                  <span className="pro-file-name">{attachment.name}</span>
                  <span className="pro-file-size">{attachment.size}</span>
                </div>
                <button className="pro-file-download" onClick={() => handleFileDownload(attachment)}>
                  ⬇️
                </button>
              </div>
            );
          }
        })}
      </div>
    );
  };

  // Handle image click for lightbox/preview
  const handleImageClick = (attachment, attachments) => {
    // Find the index of the clicked attachment
    const imageAttachments = attachments.filter(att => att.type === 'image');
    const startIndex = imageAttachments.findIndex(att => att.id === attachment.id);
    
    // Call parent's lightbox function if provided, otherwise just log
    if (onImageClick) {
      onImageClick(imageAttachments, startIndex >= 0 ? startIndex : 0);
    } else {
      console.log('Image clicked:', attachment);
    }
  };

  // Handle video click for playback
  const handleVideoClick = (attachment) => {
    // In a real app, this would open a video player or start playback
    console.log('Video clicked:', attachment);
    // You could implement video player modal here
  };

  // Handle file download
  const handleFileDownload = (attachment) => {
    // In a real app, this would trigger a download
    console.log('Downloading file:', attachment);
    // You could implement actual download logic here
  };

  // Function to render message status
  const renderMessageStatus = (status) => {
    switch (status) {
      case 'sending':
        return <span className="pro-message-status sending">Sending...</span>;
      case 'sent':
        return <span className="pro-message-status sent">Sent</span>;
      case 'delivered':
        return <span className="pro-message-status delivered">Delivered ✓</span>;
      case 'read':
        return <span className="pro-message-status read">Read ✓✓</span>;
      default:
        return null;
    }
  };
  
  // Simulate search highlight
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text.toLowerCase().includes(searchTerm.toLowerCase())) {
      return text;
    }

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() 
            ? <span key={i} className="pro-search-highlight">{part}</span> 
            : part
        )}
      </>
    );
  };

  // Highlight searched text in messages
  const highlightSearchText = (content, query) => {
    if (!query || !content) return content;
    
    try {
      const parts = content.split(new RegExp(`(${query})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === query?.toLowerCase() ? 
          <span key={i} className="search-result-highlight">{part}</span> : part
      );
    } catch (e) {
      // If regex fails, return original content
      return content;
    }
  };

  // Enhanced message item renderer with memoization
  const MessageItemRenderer = React.memo(({ index, style }) => {
    const message = processedMessages[index];
    if (!message) return null;
    
    const isOwnMessage = message.sender?.id === currentUser?.id;
    const reactions = messageReactions[message.id] || [];
    const isSelected = selectedMessages.has(message.id);
    
    return (
      <div style={style} className="virtual-message-wrapper">
        <div
          id={`message-${message.id}`}
          className={`pro-message-container ${message.shouldGroup ? 'grouped' : ''} ${isSelected ? 'selected' : ''} ${message.isHighlighted ? 'search-highlighted' : ''}`}
          tabIndex={0}
          onClick={() => handleMessageClick(message.id)}
          onFocus={() => setFocusedMessageId(message.id)}
        >
          <div className={`pro-message ${isOwnMessage ? 'own' : 'other'}`}>
            
            {/* Avatar - only show if not grouped */}
            {!message.shouldGroup && (
              <div className="pro-message-avatar">
                <img 
                  src={message.sender?.avatar || 'https://via.placeholder.com/40'} 
                  alt={message.sender?.name || 'User'}
                  loading="lazy"
                />
              </div>
            )}
            
            <div className="pro-message-content">
              {/* Header - only show if not grouped */}
              {!message.shouldGroup && (
                <div className="pro-message-header">
                  <span className="pro-message-sender">
                    {message.sender?.name || 'Anonymous'}
                  </span>
                  <span className="pro-message-timestamp">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  {message.edited && (
                    <span className="pro-message-edited">
                      (edited)
                    </span>
                  )}
                </div>
              )}
              
              {/* Message body */}
              <div className="pro-message-body">
                {message.content && (
                  <div 
                    className="pro-message-text"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightSearchText(message.content, searchQuery) 
                    }}
                  />
                )}
                
                {/* Enhanced attachments rendering */}
                {renderAttachments(message.attachments, message.id)}
                
                {/* Reactions */}
                {reactions.length > 0 && (
                  <MessageReactions
                    reactions={reactions}
                    onReactionClick={(emoji) => handleAddReaction(message.id, emoji)}
                    currentUserId={currentUser?.id}
                  />
                )}
              </div>
              
              {/* Message status for own messages */}
              {isOwnMessage && (
                <div className="pro-message-status">
                  {message.status === 'sending' && (
                    <div className="status-indicator sending">
                      <div className="spinner"></div>
                    </div>
                  )}
                  {message.status === 'sent' && (
                    <div className="status-indicator sent">✓</div>
                  )}
                  {message.status === 'delivered' && (
                    <div className="status-indicator delivered">✓✓</div>
                  )}
                  {message.status === 'read' && (
                    <div className="status-indicator read">✓✓</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Message actions on hover */}
            <div className="pro-message-actions">
              <button
                className="message-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenReactionPicker(e, message.id);
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
                  // Handle reply
                }}
                title="Reply"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                </svg>
              </button>
              
              {isOwnMessage && (
                <button
                  className="message-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingMessageId(message.id);
                  }}
                  title="Edit"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="pro-message-list enhanced" ref={messageListRef}>
      {/* Pinned messages */}
      <PinnedMessages 
        pinnedMessages={pinnedMessages}
        onMessageClick={(id) => {
          const messageIndex = processedMessages.findIndex(m => m.id === id);
          if (messageIndex !== -1 && virtualListRef.current) {
            virtualListRef.current.scrollToItem(messageIndex, 'center');
            // Highlight briefly
            setTimeout(() => {
              const element = document.getElementById(`message-${id}`);
              if (element) {
                element.classList.add('message-highlight');
                setTimeout(() => {
                  element.classList.remove('message-highlight');
                }, 2000);
              }
            }, 100);
          }
        }}
        currentUser={currentUser}
      />
      
      {/* Enhanced virtual message list */}
      {processedMessages.length > 0 ? (
        <div className="virtual-message-container">
          <List
            ref={virtualListRef}
            height={600} // Adjust based on container
            itemCount={processedMessages.length}
            itemSize={getItemHeight}
            onScroll={handleScroll}
            className="virtual-message-list"
            overscanCount={5}
          >
            {MessageItemRenderer}
          </List>
        </div>
      ) : (
        <div className="empty-message-state">
          <div className="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
          </div>
          <h3>No messages yet</h3>
          <p>Start the conversation by sending your first message!</p>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="loading-messages">
          <MessageSkeleton count={2} position="left" />
          <MessageSkeleton count={1} position="right" />
          <MessageSkeleton count={1} position="left" />
        </div>
      )}
      
      {/* Reaction picker overlay */}
      {reactionMenuOpen && (
        <div 
          className="reaction-picker-overlay"
          onClick={() => setReactionMenuOpen(null)}
        >
          <div 
            className="reaction-picker"
            onClick={(e) => e.stopPropagation()}
          >
            {reactions.map(emoji => (
              <button
                key={emoji}
                className="reaction-option"
                onClick={() => {
                  handleAddReaction(reactionMenuOpen, emoji);
                  setReactionMenuOpen(null);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Scroll to bottom indicator */}
      {!isNearBottom && processedMessages.length > 0 && (
        <button
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          title="Scroll to bottom"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14l5 5 5-5z"/>
          </svg>
          {unreadCount > 0 && (
            <span className="unread-count">{unreadCount}</span>
          )}
        </button>
      )}
      
      {/* Jump to latest component */}
      <JumpToLatest 
        unreadCount={unreadCount}
        isVisible={!isNearBottom}
        onClick={scrollToBottom}
      />
      
      {/* Scroll to bottom ref for external control */}
      <div ref={messagesEndRef} />
      </div>
    );
};

export default ProMessageList;
