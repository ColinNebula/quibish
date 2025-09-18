import React, { useState, useEffect, useRef } from 'react';
import InteractiveMessageFeatures, { EnhancedTypingIndicator, InteractiveMessageThread } from './InteractiveMessageFeatures';
import './MessageReactions.css';

const MessageReactions = ({ 
  messageId,
  reactions = [],
  currentUserId,
  onReactionAdd,
  onReactionRemove,
  maxDisplayed = 5,
  showAddButton = true
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [animatingReactions, setAnimatingReactions] = useState(new Set());
  const reactionPickerRef = useRef(null);

  // Popular reactions for quick access
  const popularReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

  // Process reactions to group by emoji
  const processedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasCurrentUser: false
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user);
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true;
    }
    return acc;
  }, {});

  const reactionList = Object.values(processedReactions)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxDisplayed);

  const overflowCount = Object.keys(processedReactions).length - maxDisplayed;

  const handleReactionClick = (emoji) => {
    const reaction = processedReactions[emoji];
    
    if (reaction?.hasCurrentUser) {
      // Remove reaction
      if (onReactionRemove) {
        onReactionRemove(messageId, emoji);
      }
    } else {
      // Add reaction
      if (onReactionAdd) {
        onReactionAdd(messageId, emoji);
      }
      
      // Trigger animation
      setAnimatingReactions(prev => new Set([...prev, emoji]));
      setTimeout(() => {
        setAnimatingReactions(prev => {
          const newSet = new Set(prev);
          newSet.delete(emoji);
          return newSet;
        });
      }, 600);
    }
  };

  const handleAddReaction = (emoji) => {
    handleReactionClick(emoji);
    setShowReactionPicker(false);
  };

  const getReactionTooltip = (reaction) => {
    if (reaction.count === 1) {
      return `${reaction.users[0].name} reacted with ${reaction.emoji}`;
    } else if (reaction.count === 2) {
      return `${reaction.users[0].name} and ${reaction.users[1].name} reacted with ${reaction.emoji}`;
    } else {
      return `${reaction.users[0].name} and ${reaction.count - 1} others reacted with ${reaction.emoji}`;
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (reactionList.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div className="message-reactions">
      {/* Existing reactions */}
      {reactionList.map((reaction) => (
        <button
          key={reaction.emoji}
          className={`reaction-bubble ${reaction.hasCurrentUser ? 'active' : ''} ${
            animatingReactions.has(reaction.emoji) ? 'animating' : ''
          }`}
          onClick={() => handleReactionClick(reaction.emoji)}
          title={getReactionTooltip(reaction)}
        >
          <span className="reaction-emoji">{reaction.emoji}</span>
          <span className="reaction-count">{reaction.count}</span>
          <div className="reaction-ripple"></div>
        </button>
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <button className="reaction-overflow" title="More reactions">
          +{overflowCount}
        </button>
      )}

      {/* Add reaction button */}
      {showAddButton && (
        <div className="add-reaction-container">
          <button
            className="add-reaction-btn"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            title="Add reaction"
          >
            😀+
          </button>

          {/* Reaction picker */}
          {showReactionPicker && (
            <div className="reaction-picker" ref={reactionPickerRef}>
              <div className="reaction-picker-content">
                <div className="popular-reactions">
                  {popularReactions.map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-option"
                      onClick={() => handleAddReaction(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Read Receipts Component
export const ReadReceipts = ({ 
  messageId,
  readBy = [],
  totalRecipients = 0,
  showAvatars = true,
  maxAvatars = 3,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (readBy.length === 0) return null;

  const readPercentage = totalRecipients > 0 ? (readBy.length / totalRecipients) * 100 : 0;
  const unreadCount = totalRecipients - readBy.length;

  return (
    <div className={`read-receipts ${compact ? 'compact' : ''}`}>
      {showAvatars && readBy.length > 0 && (
        <div className="read-avatars">
          {readBy.slice(0, maxAvatars).map((user, index) => (
            <div 
              key={user.id}
              className="read-avatar"
              style={{ zIndex: maxAvatars - index }}
              title={`Read by ${user.name}`}
            >
              <img src={user.avatar} alt={user.name} />
              <div className="read-checkmark">✓</div>
            </div>
          ))}
          {readBy.length > maxAvatars && (
            <div className="read-overflow">
              +{readBy.length - maxAvatars}
            </div>
          )}
        </div>
      )}

      <div className="read-status">
        {compact ? (
          <span className="read-text">
            {readBy.length === totalRecipients ? '✓✓' : `${readBy.length}/${totalRecipients}`}
          </span>
        ) : (
          <>
            <span className="read-text">
              Read by {readBy.length}
              {totalRecipients > 0 && ` of ${totalRecipients}`}
            </span>
            {totalRecipients > 0 && (
              <div className="read-progress">
                <div 
                  className="read-progress-bar"
                  style={{ width: `${readPercentage}%` }}
                ></div>
              </div>
            )}
          </>
        )}
      </div>

      {!compact && (
        <button 
          className="read-details-btn"
          onClick={() => setShowDetails(!showDetails)}
          title="Show read details"
        >
          ℹ️
        </button>
      )}

      {showDetails && (
        <div className="read-details-modal">
          <div className="modal-overlay" onClick={() => setShowDetails(false)} />
          <div className="read-details-content">
            <div className="read-details-header">
              <h3>Read by {readBy.length} people</h3>
              <button onClick={() => setShowDetails(false)}>✕</button>
            </div>
            <div className="read-details-list">
              {readBy.map((user) => (
                <div key={user.id} className="read-detail-item">
                  <img src={user.avatar} alt={user.name} />
                  <div className="read-detail-info">
                    <span className="read-detail-name">{user.name}</span>
                    <span className="read-detail-time">
                      {new Date(user.readAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {unreadCount > 0 && (
              <div className="unread-info">
                {unreadCount} people haven't read this message yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Message Threading Component
export const MessageThread = ({ 
  parentMessage,
  replies = [],
  onReply,
  onReaction,
  currentUserId,
  maxDisplayedReplies = 3,
  showViewAll = true
}) => {
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const replyInputRef = useRef(null);

  const displayedReplies = showAllReplies ? replies : replies.slice(0, maxDisplayedReplies);
  const hiddenRepliesCount = replies.length - maxDisplayedReplies;

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (newReply.trim() && onReply) {
      onReply(parentMessage.id, newReply.trim());
      setNewReply('');
      setIsReplying(false);
    }
  };

  const handleStartReply = () => {
    setIsReplying(true);
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setIsReplying(false);
    setNewReply('');
  };

  if (replies.length === 0 && !isReplying) {
    return (
      <button className="start-thread-btn" onClick={handleStartReply}>
        💬 Start a thread
      </button>
    );
  }

  return (
    <div className="message-thread">
      {/* Thread indicator */}
      <div className="thread-indicator">
        <div className="thread-line"></div>
        <div className="thread-icon">💬</div>
      </div>

      {/* Replies */}
      <div className="thread-replies">
        {displayedReplies.map((reply) => (
          <div key={reply.id} className="thread-reply">
            <div className="reply-avatar">
              <img src={reply.sender.avatar} alt={reply.sender.name} />
            </div>
            <div className="reply-content">
              <div className="reply-header">
                <span className="reply-sender">{reply.sender.name}</span>
                <span className="reply-time">
                  {new Date(reply.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="reply-text">{reply.text}</div>
              <MessageReactions
                messageId={reply.id}
                reactions={reply.reactions || []}
                currentUserId={currentUserId}
                onReactionAdd={onReaction}
                onReactionRemove={onReaction}
                maxDisplayed={3}
                showAddButton={true}
              />
            </div>
          </div>
        ))}

        {/* Show more replies button */}
        {!showAllReplies && hiddenRepliesCount > 0 && showViewAll && (
          <button 
            className="show-more-replies"
            onClick={() => setShowAllReplies(true)}
          >
            View {hiddenRepliesCount} more {hiddenRepliesCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {/* Reply input */}
        {isReplying ? (
          <form onSubmit={handleReplySubmit} className="reply-form">
            <div className="reply-input-container">
              <img 
                src={`https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff`}
                alt="You"
                className="reply-input-avatar"
              />
              <input
                ref={replyInputRef}
                type="text"
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Reply to thread..."
                className="reply-input"
              />
              <div className="reply-actions">
                <button 
                  type="submit" 
                  className="reply-send"
                  disabled={!newReply.trim()}
                >
                  ↗️
                </button>
                <button 
                  type="button"
                  className="reply-cancel"
                  onClick={handleCancelReply}
                >
                  ✕
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button className="add-reply-btn" onClick={handleStartReply}>
            💬 Reply to thread
          </button>
        )}
      </div>

      {/* Thread summary */}
      <div className="thread-summary">
        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
      </div>
    </div>
  );
};

// Message Forwarding Component
export const MessageForwarding = ({ 
  message,
  onForward,
  onCancel,
  contacts = []
}) => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactToggle = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleForward = () => {
    if (selectedContacts.length > 0 && onForward) {
      onForward(message.id, selectedContacts, forwardMessage);
    }
  };

  return (
    <div className="message-forwarding">
      <div className="forward-overlay" onClick={onCancel} />
      <div className="forward-modal">
        <div className="forward-header">
          <h3>Forward Message</h3>
          <button onClick={onCancel}>✕</button>
        </div>

        <div className="forward-content">
          {/* Original message preview */}
          <div className="forward-preview">
            <div className="preview-label">Forwarding:</div>
            <div className="preview-message">
              {message.text?.substring(0, 100)}
              {message.text?.length > 100 && '...'}
            </div>
          </div>

          {/* Contact search */}
          <div className="contact-search">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Contact list */}
          <div className="contact-list">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`contact-item ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}
                onClick={() => handleContactToggle(contact.id)}
              >
                <img src={contact.avatar} alt={contact.name} />
                <span className="contact-name">{contact.name}</span>
                {selectedContacts.includes(contact.id) && (
                  <div className="contact-check">✓</div>
                )}
              </div>
            ))}
          </div>

          {/* Additional message */}
          <div className="forward-message">
            <textarea
              placeholder="Add a message (optional)..."
              value={forwardMessage}
              onChange={(e) => setForwardMessage(e.target.value)}
              className="forward-message-input"
              rows={3}
            />
          </div>

          {/* Selected contacts preview */}
          {selectedContacts.length > 0 && (
            <div className="selected-contacts">
              <div className="selected-label">
                Forwarding to {selectedContacts.length} contact(s):
              </div>
              <div className="selected-list">
                {selectedContacts.map(contactId => {
                  const contact = contacts.find(c => c.id === contactId);
                  return contact ? (
                    <span key={contactId} className="selected-contact">
                      {contact.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="forward-actions">
          <button onClick={onCancel} className="forward-cancel">
            Cancel
          </button>
          <button 
            onClick={handleForward}
            className="forward-send"
            disabled={selectedContacts.length === 0}
          >
            Forward to {selectedContacts.length} contact(s)
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageReactions;