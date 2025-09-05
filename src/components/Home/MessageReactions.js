import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const MessageReactions = ({ reactions = [], onAddReaction, messageId }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Common emoji reactions (kept short)
  const commonEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '🎉', '🤔'];

  // Group reactions by emoji for summary display
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {});

  // Keep backward-compatible api: onAddReaction(messageId, emoji) or onAddReaction(messageId, {emoji,...})
  const emitReaction = useCallback((emoji) => {
    if (!emoji) return;
    // If the parent expects a simple emoji string, call it that way
    try {
      onAddReaction(messageId, emoji);
    } catch (err) {
      // Fallback to object-shaped call
      onAddReaction(messageId, {
        emoji,
        userId: 'current-user',
        username: 'You',
        timestamp: new Date().toISOString()
      });
    }
    setShowReactionPicker(false);
  }, [onAddReaction, messageId]);

  const handleBadgeKey = (e, emoji) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      emitReaction(emoji);
    }
  };

  // Keyboard navigation inside picker
  const onPickerKey = (e) => {
    if (e.key === 'Escape') {
      setShowReactionPicker(false);
      buttonRef.current?.focus();
    }
  };

  // Click outside to close picker
  useEffect(() => {
    const onDocClick = (ev) => {
      if (!showReactionPicker) return;
      if (pickerRef.current && !pickerRef.current.contains(ev.target) && !buttonRef.current?.contains(ev.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showReactionPicker]);

  return (
    <div className="message-reactions-container" aria-live="polite">
      {/* Display existing reactions */}
      <div className="reactions-display" role="list" aria-label="Reactions">
        {Object.entries(groupedReactions).map(([emoji, users]) => (
          <div 
            key={emoji} 
            role="listitem"
            tabIndex={0}
            className="reaction-badge"
            onClick={() => emitReaction(emoji)}
            onKeyDown={(e) => handleBadgeKey(e, emoji)}
            title={users.map(u => u.username).join(', ')}
            aria-label={`${emoji} ${users.length} reactions`}
          >
            <span className="reaction-emoji">{emoji}</span>
            <span className="reaction-count">{users.length}</span>
          </div>
        ))}
      </div>

      {/* Add reaction button */}
      <button 
        ref={buttonRef}
        className="add-reaction-button"
        onClick={() => setShowReactionPicker(s => !s)}
        aria-label="Add reaction"
        aria-expanded={showReactionPicker}
        aria-haspopup="true"
        title="Add reaction"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      </button>

      {/* Emoji picker */}
      {showReactionPicker && (
        <div className="reaction-picker" role="menu" onKeyDown={onPickerKey} ref={pickerRef}>
          {commonEmojis.map((emoji, idx) => (
            <button 
              key={emoji} 
              className="emoji-button"
              onClick={() => emitReaction(emoji)}
              role="menuitem"
              aria-label={`React with ${emoji}`}
              tabIndex={0}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

MessageReactions.propTypes = {
  reactions: PropTypes.arrayOf(PropTypes.shape({
    emoji: PropTypes.string.isRequired,
    userId: PropTypes.string,
    username: PropTypes.string,
    timestamp: PropTypes.string
  })),
  onAddReaction: PropTypes.func.isRequired,
  messageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

MessageReactions.defaultProps = {
  reactions: [],
  messageId: null
};

MessageReactions.displayName = 'MessageReactions';

export default React.memo(MessageReactions);
