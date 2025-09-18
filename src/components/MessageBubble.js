import React, { useState, useEffect, useRef } from 'react';
import './MessageBubble.css';

const MessageBubble = ({ 
  message, 
  isCurrentUser, 
  showAvatar = true, 
  isGrouped = false,
  isLastInGroup = false,
  onReaction,
  onQuote,
  onImageClick 
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const messageRef = useRef(null);
  const reactionsRef = useRef(null);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'now' : `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '❌';
      default:
        return '';
    }
  };

  const handleReactionClick = (emoji) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowReactions(false);
  };

  const detectLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="message-link"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const renderFileAttachment = (file) => {
    const getFileExtension = (filename) => filename.split('.').pop().toUpperCase();
    
    return (
      <div className="file-attachment" onClick={() => window.open(file.url, '_blank')}>
        <div className="file-icon">
          {getFileExtension(file.name)}
        </div>
        <div className="file-info">
          <div className="file-name">{file.name}</div>
          <div className="file-size">{file.size}</div>
        </div>
      </div>
    );
  };

  const renderImageMessage = (image) => {
    return (
      <div className="image-message" onClick={() => onImageClick && onImageClick(image)}>
        <img 
          src={image.url} 
          alt={image.alt || 'Shared image'}
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
        {!imageLoaded && (
          <div className="image-placeholder">
            <div className="shimmer-effect"></div>
          </div>
        )}
      </div>
    );
  };

  const renderQuotedMessage = (quote) => {
    return (
      <div className="quoted-message">
        <div className="quoted-sender">{quote.sender}</div>
        <div className="quoted-text">{quote.text}</div>
      </div>
    );
  };

  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionsRef.current && !reactionsRef.current.contains(event.target)) {
        setShowReactions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={messageRef}
      className={`message-container ${isCurrentUser ? 'sent' : 'received'} ${isGrouped ? 'grouped' : ''}`}
    >
      {/* Avatar (only for received messages and when not grouped) */}
      {!isCurrentUser && showAvatar && !isGrouped && (
        <div className="message-avatar">
          <img 
            src={message.sender?.avatar || `https://ui-avatars.com/api/?name=${message.sender?.name}&background=random`}
            alt={message.sender?.name}
          />
        </div>
      )}

      <div className="message-bubble-wrapper">
        {/* Sender name (only for received messages in groups) */}
        {!isCurrentUser && !isGrouped && (
          <div className="sender-info">
            {message.sender?.name || 'Unknown'}
          </div>
        )}

        <div 
          className="message-bubble"
          onDoubleClick={() => setShowReactions(!showReactions)}
        >
          {/* Quoted message */}
          {message.quotedMessage && renderQuotedMessage(message.quotedMessage)}

          {/* Message content */}
          <div className="message-content">
            {message.type === 'text' && (
              <div className="message-text">
                {detectLinks(message.text)}
              </div>
            )}

            {message.type === 'image' && renderImageMessage(message.image)}
            {message.type === 'file' && renderFileAttachment(message.file)}

            {/* Link preview */}
            {message.linkPreview && (
              <div className="link-preview">
                {message.linkPreview.image && (
                  <img 
                    src={message.linkPreview.image} 
                    alt="Link preview"
                    className="link-preview-image"
                  />
                )}
                <div className="link-preview-content">
                  <div className="link-preview-title">{message.linkPreview.title}</div>
                  {message.linkPreview.description && (
                    <div className="link-preview-description">
                      {message.linkPreview.description}
                    </div>
                  )}
                  <div className="link-preview-url">{message.linkPreview.url}</div>
                </div>
              </div>
            )}
          </div>

          {/* Message reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="message-reactions">
              {message.reactions.map((reaction, index) => (
                <div 
                  key={index}
                  className={`reaction ${reaction.isCurrentUser ? 'active' : ''}`}
                  onClick={() => handleReactionClick(reaction.emoji)}
                >
                  <span className="reaction-emoji">{reaction.emoji}</span>
                  <span className="reaction-count">{reaction.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Message metadata */}
          <div className="message-metadata">
            <span className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </span>
            
            {/* Status indicator (only for sent messages) */}
            {isCurrentUser && (
              <div className="message-status">
                <div className={`status-icon status-${message.status}`}>
                  <span className="status-text">{getStatusIcon(message.status)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className="reaction-picker" ref={reactionsRef}>
            <div className="reaction-picker-content">
              {availableReactions.map((emoji, index) => (
                <button 
                  key={index}
                  className="reaction-option"
                  onClick={() => handleReactionClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Context menu trigger (invisible) */}
      <div 
        className="message-actions"
        onClick={() => setShowReactions(!showReactions)}
      >
        ⋯
      </div>
    </div>
  );
};

// Typing Indicator Component
export const TypingIndicator = ({ users = [], visible = false }) => {
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
    <div className="typing-indicator">
      <div className="typing-dots">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
      <span className="typing-text">{getTypingText()}</span>
    </div>
  );
};

// Message Group Component
export const MessageGroup = ({ messages, currentUserId, onReaction, onQuote, onImageClick }) => {
  const groupMessages = () => {
    const groups = [];
    let currentGroup = [];
    let lastSender = null;
    let lastTime = null;

    messages.forEach((message, index) => {
      const timeDiff = lastTime ? new Date(message.timestamp) - lastTime : 0;
      const isSameSender = message.senderId === lastSender;
      const isWithinGroupTime = timeDiff < 5 * 60 * 1000; // 5 minutes

      if (isSameSender && isWithinGroupTime && currentGroup.length < 5) {
        currentGroup.push(message);
      } else {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [message];
      }

      lastSender = message.senderId;
      lastTime = new Date(message.timestamp);
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  const messageGroups = groupMessages();

  return (
    <div className="message-groups">
      {messageGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="message-group">
          {group.map((message, messageIndex) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.senderId === currentUserId}
              showAvatar={messageIndex === group.length - 1}
              isGrouped={group.length > 1 && messageIndex > 0}
              isLastInGroup={messageIndex === group.length - 1}
              onReaction={onReaction}
              onQuote={onQuote}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default MessageBubble;