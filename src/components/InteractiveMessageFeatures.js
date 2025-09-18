import React, { useState, useEffect, useRef } from 'react';
import './InteractiveMessageFeatures.css';

const InteractiveMessageFeatures = ({
  message,
  currentUserId,
  onReaction,
  onReply,
  onForward,
  onDelete,
  onEdit,
  onMarkAsRead,
  enableReactions = true,
  enableReplies = true,
  enableForwarding = true,
  enableEditing = true
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messageRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const contextMenuRef = useRef(null);
  const editInputRef = useRef(null);

  // Popular emoji reactions
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];
  
  // Extended emoji categories
  const emojiCategories = {
    reactions: ['👍', '👎', '❤️', '💔', '😍', '🥰', '😘', '😗'],
    emotions: ['😀', '😂', '🤣', '😊', '😇', '🙂', '🤔', '😐'],
    gestures: ['👋', '🤚', '✋', '🖖', '👌', '🤞', '✌️', '🤟'],
    objects: ['🔥', '💯', '⭐', '✨', '🎉', '🎊', '💎', '🏆']
  };

  // Message action menu items
  const getActionMenuItems = () => {
    const items = [];
    
    if (enableReplies) {
      items.push({
        icon: '↩️',
        label: 'Reply',
        action: () => handleReply()
      });
    }
    
    if (enableReactions) {
      items.push({
        icon: '😀',
        label: 'React',
        action: () => setShowReactionPicker(true)
      });
    }
    
    if (enableForwarding) {
      items.push({
        icon: '📤',
        label: 'Forward',
        action: () => handleForward()
      });
    }
    
    items.push({
      icon: '📋',
      label: 'Copy',
      action: () => handleCopy()
    });
    
    if (message.senderId === currentUserId && enableEditing) {
      items.push({
        icon: '✏️',
        label: 'Edit',
        action: () => handleEdit()
      });
      
      items.push({
        icon: '🗑️',
        label: 'Delete',
        action: () => handleDelete(),
        danger: true
      });
    }
    
    items.push({
      icon: '📊',
      label: 'Message Info',
      action: () => setShowReadReceipts(true)
    });
    
    return items;
  };

  // Handle right-click context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = messageRef.current.getBoundingClientRect();
    setContextMenuPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setShowContextMenu(true);
  };

  // Handle double-click for quick reaction
  const handleDoubleClick = () => {
    if (enableReactions) {
      handleQuickReaction('❤️');
    }
  };

  // Quick reaction (heart on double-click)
  const handleQuickReaction = (emoji) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    
    // Show reaction animation
    const reactionElement = document.createElement('div');
    reactionElement.className = 'quick-reaction-animation';
    reactionElement.textContent = emoji;
    reactionElement.style.position = 'absolute';
    reactionElement.style.left = '50%';
    reactionElement.style.top = '50%';
    reactionElement.style.transform = 'translate(-50%, -50%)';
    reactionElement.style.fontSize = '24px';
    reactionElement.style.pointerEvents = 'none';
    reactionElement.style.zIndex = '1000';
    
    messageRef.current.appendChild(reactionElement);
    
    setTimeout(() => {
      if (reactionElement.parentNode) {
        reactionElement.parentNode.removeChild(reactionElement);
      }
    }, 1000);
  };

  // Handle emoji reaction
  const handleEmojiReaction = (emoji) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowReactionPicker(false);
    setShowEmojiPicker(false);
  };

  // Handle reply
  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
    setShowContextMenu(false);
  };

  // Handle forward
  const handleForward = () => {
    if (onForward) {
      onForward(message);
    }
    setShowContextMenu(false);
  };

  // Handle copy text
  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      // Show copy feedback
      showNotification('Message copied to clipboard');
    }
    setShowContextMenu(false);
  };

  // Handle edit message
  const handleEdit = () => {
    setIsEditing(true);
    setEditText(message.text || '');
    setShowContextMenu(false);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 100);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (onEdit && editText.trim() !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text || '');
  };

  // Handle delete message
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      if (onDelete) {
        onDelete(message.id);
      }
    }
    setShowContextMenu(false);
  };

  // Show notification
  const showNotification = (text) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'action-notification';
    notification.textContent = text;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 10000;
      animation: notificationSlideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'notificationSlideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  };

  // Handle keyboard shortcuts in edit mode
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(false);
        setShowEmojiPicker(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark as read when message comes into view
  useEffect(() => {
    if (message.senderId !== currentUserId && message.status !== 'read') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && onMarkAsRead) {
              onMarkAsRead(message.id);
            }
          });
        },
        { threshold: 0.5 }
      );

      if (messageRef.current) {
        observer.observe(messageRef.current);
      }

      return () => observer.disconnect();
    }
  }, [message.id, message.senderId, message.status, currentUserId, onMarkAsRead]);

  return (
    <div 
      ref={messageRef}
      className="interactive-message"
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* Message content or edit input */}
      {isEditing ? (
        <div className="message-edit-container">
          <textarea
            ref={editInputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            className="message-edit-input"
            rows={3}
            placeholder="Edit your message..."
          />
          <div className="edit-actions">
            <button 
              className="edit-action save"
              onClick={handleSaveEdit}
              disabled={!editText.trim()}
            >
              ✓ Save
            </button>
            <button 
              className="edit-action cancel"
              onClick={handleCancelEdit}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Original message content goes here */}
          <div className="message-content">
            {message.text}
            {message.edited && (
              <span className="edited-indicator">(edited)</span>
            )}
          </div>

          {/* Quick reaction overlay */}
          <div className="quick-reactions">
            {quickReactions.slice(0, 3).map((emoji, index) => (
              <button
                key={index}
                className="quick-reaction-btn"
                onClick={() => handleQuickReaction(emoji)}
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              className="more-reactions-btn"
              onClick={() => setShowReactionPicker(true)}
              title="More reactions"
            >
              😀+
            </button>
          </div>
        </>
      )}

      {/* Reaction Picker */}
      {showReactionPicker && (
        <div className="reaction-picker-overlay" ref={reactionPickerRef}>
          <div className="reaction-picker-container">
            {/* Quick reactions */}
            <div className="reaction-section">
              <div className="reaction-section-title">Quick Reactions</div>
              <div className="reaction-grid quick">
                {quickReactions.map((emoji, index) => (
                  <button
                    key={index}
                    className="reaction-emoji-btn"
                    onClick={() => handleEmojiReaction(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Extended emoji picker */}
            {showEmojiPicker ? (
              <div className="emoji-picker-extended">
                {Object.entries(emojiCategories).map(([category, emojis]) => (
                  <div key={category} className="emoji-category">
                    <div className="emoji-category-title">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    <div className="reaction-grid">
                      {emojis.map((emoji, index) => (
                        <button
                          key={index}
                          className="reaction-emoji-btn"
                          onClick={() => handleEmojiReaction(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                className="show-more-emojis"
                onClick={() => setShowEmojiPicker(true)}
              >
                Show More Emojis →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div 
          className="context-menu"
          ref={contextMenuRef}
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y
          }}
        >
          {getActionMenuItems().map((item, index) => (
            <button
              key={index}
              className={`context-menu-item ${item.danger ? 'danger' : ''}`}
              onClick={item.action}
            >
              <span className="context-menu-icon">{item.icon}</span>
              <span className="context-menu-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Read Receipts Modal */}
      {showReadReceipts && (
        <div className="read-receipts-modal">
          <div className="modal-overlay" onClick={() => setShowReadReceipts(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Message Info</h3>
              <button 
                className="modal-close"
                onClick={() => setShowReadReceipts(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <ReadReceiptsList message={message} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Read Receipts List Component
const ReadReceiptsList = ({ message }) => {
  const receipts = message.readReceipts || [];
  
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="read-receipts-list">
      <div className="receipt-section">
        <h4>📤 Sent</h4>
        <div className="receipt-item">
          <span className="receipt-time">{formatTime(message.timestamp)}</span>
        </div>
      </div>
      
      {message.deliveredAt && (
        <div className="receipt-section">
          <h4>📬 Delivered</h4>
          <div className="receipt-item">
            <span className="receipt-time">{formatTime(message.deliveredAt)}</span>
          </div>
        </div>
      )}
      
      {receipts.length > 0 && (
        <div className="receipt-section">
          <h4>👁️ Read by {receipts.length} user(s)</h4>
          {receipts.map((receipt, index) => (
            <div key={index} className="receipt-item">
              <img 
                src={receipt.user.avatar} 
                alt={receipt.user.name}
                className="receipt-avatar"
              />
              <div className="receipt-info">
                <span className="receipt-name">{receipt.user.name}</span>
                <span className="receipt-time">{formatTime(receipt.readAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {receipts.length === 0 && message.status === 'delivered' && (
        <div className="receipt-section">
          <p className="no-receipts">Message delivered but not yet read</p>
        </div>
      )}
    </div>
  );
};

// Enhanced Typing Indicator Component
export const EnhancedTypingIndicator = ({ 
  users = [], 
  visible = false,
  showAvatars = true,
  compact = false
}) => {
  if (!visible || users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name} is typing`;
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing`;
    } else {
      return `${users[0].name} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <div className={`enhanced-typing-indicator ${compact ? 'compact' : ''}`}>
      {showAvatars && (
        <div className="typing-avatars">
          {users.slice(0, 3).map((user, index) => (
            <div 
              key={user.id}
              className="typing-avatar"
              style={{ 
                animationDelay: `${index * 0.2}s`,
                zIndex: users.length - index 
              }}
            >
              <img src={user.avatar} alt={user.name} />
              <div className="typing-pulse"></div>
            </div>
          ))}
        </div>
      )}
      
      <div className="typing-content">
        <div className="typing-dots">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
        {!compact && (
          <span className="typing-text">{getTypingText()}...</span>
        )}
      </div>
    </div>
  );
};

// Message Thread Component with Interactive Features
export const InteractiveMessageThread = ({ 
  messages = [],
  currentUserId,
  onSendMessage,
  onReaction,
  onReply,
  onForward,
  onEdit,
  onDelete,
  typingUsers = []
}) => {
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleForward = (message) => {
    setForwardingMessage(message);
    // Show forward dialog
    console.log('Forwarding message:', message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <div className="interactive-message-thread">
      <div className="messages-list">
        {messages.map((message) => (
          <InteractiveMessageFeatures
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onReaction={onReaction}
            onReply={handleReply}
            onForward={handleForward}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        
        <EnhancedTypingIndicator 
          users={typingUsers}
          visible={typingUsers.length > 0}
        />
      </div>
      
      {/* Reply Preview */}
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-header">
            <span>Replying to {replyingTo.sender?.name || 'Unknown'}</span>
            <button onClick={handleCancelReply}>✕</button>
          </div>
          <div className="reply-content">
            {replyingTo.text?.substring(0, 100)}
            {replyingTo.text?.length > 100 && '...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMessageFeatures;