import React, { useState, useEffect, useCallback } from 'react';
import messageThreadService from '../../services/messageThreadService';
import './ThreadView.css';

const ThreadView = ({ 
  thread, 
  onReply, 
  onClose,
  currentUser,
  compact = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  if (!thread) return null;

  const { parentMessage, replies = [], replyCount } = thread;

  const handleReply = () => {
    if (!replyText.trim()) return;

    const reply = {
      id: Date.now(),
      text: replyText,
      user: currentUser,
      timestamp: new Date().toISOString(),
      reactions: []
    };

    if (onReply) {
      onReply(thread.id, reply);
    }

    messageThreadService.addReply(thread.id, reply);
    setReplyText('');
    setShowReplyInput(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getParticipantAvatars = () => {
    const participants = Array.from(thread.participants || []);
    return participants.slice(0, 3);
  };

  return (
    <div className={`thread-view ${compact ? 'compact' : ''} ${!isExpanded ? 'collapsed' : ''}`}>
      {/* Thread Header */}
      <div className="thread-header">
        <div className="thread-info">
          <button 
            className="thread-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse thread' : 'Expand thread'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <span className="thread-title">
            Thread: {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
          <div className="thread-participants">
            {getParticipantAvatars().map((userId, index) => (
              <div key={userId} className="participant-avatar" style={{ zIndex: 3 - index }}>
                👤
              </div>
            ))}
          </div>
        </div>
        {onClose && (
          <button className="thread-close" onClick={onClose} title="Close thread view">
            ✕
          </button>
        )}
      </div>

      {/* Thread Content */}
      {isExpanded && (
        <div className="thread-content">
          {/* Parent Message */}
          <div className="thread-parent-message">
            <div className="message-header">
              <span className="message-avatar">👤</span>
              <div className="message-info">
                <span className="message-author">{parentMessage.user?.name || 'Unknown'}</span>
                <span className="message-time">{formatTime(parentMessage.timestamp)}</span>
              </div>
            </div>
            <div className="message-text">{parentMessage.text}</div>
          </div>

          {/* Thread Divider */}
          <div className="thread-divider">
            <span className="divider-line"></span>
            <span className="divider-text">{replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}</span>
            <span className="divider-line"></span>
          </div>

          {/* Replies */}
          <div className="thread-replies">
            {replies.map((reply, index) => (
              <div key={reply.id || index} className="thread-reply">
                <div className="reply-connector"></div>
                <div className="reply-content">
                  <div className="message-header">
                    <span className="message-avatar">👤</span>
                    <div className="message-info">
                      <span className="message-author">{reply.user?.name || 'Unknown'}</span>
                      <span className="message-time">{formatTime(reply.timestamp)}</span>
                    </div>
                  </div>
                  <div className="message-text">{reply.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Input */}
          {showReplyInput ? (
            <div className="thread-reply-input">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="reply-textarea"
                rows="3"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
              />
              <div className="reply-actions">
                <button 
                  className="reply-cancel-btn"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyText('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="reply-send-btn"
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                >
                  Send Reply
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="thread-reply-btn"
              onClick={() => setShowReplyInput(true)}
            >
              💬 Reply to thread
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadView;
