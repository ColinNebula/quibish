import React, { useState } from 'react';

const MessageThread = ({ 
  parentMessage,
  threadMessages = [],
  onReply,
  currentUser,
  isExpanded = false,
  threadId
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const visibleMessages = expanded ? threadMessages : threadMessages.slice(0, 2);
  const hiddenCount = threadMessages.length - visibleMessages.length;
  
  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(threadId, replyText);
      setReplyText('');
      setShowReplyForm(false);
    }
  };
  
  return (
    <div className="pro-message-thread">
      <div className="pro-thread-header" onClick={() => setExpanded(!expanded)}>
        <div className="pro-thread-line"></div>
        <div className="pro-thread-summary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>
            {threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}
          </span>
          <svg className={`pro-thread-chevron ${expanded ? 'expanded' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      {expanded && (
        <div className="pro-thread-content">
          {visibleMessages.map((message, index) => (
            <div 
              key={message.id} 
              className={`pro-thread-message ${message.sender.id === currentUser ? 'pro-thread-message-own' : ''}`}
            >
              <div className="pro-thread-message-avatar">
                <img src={message.sender.avatar} alt={message.sender.name} />
              </div>
              <div className="pro-thread-message-content">
                <div className="pro-thread-message-header">
                  <span className="pro-thread-message-name">{message.sender.name}</span>
                  <span className="pro-thread-message-time">{formatMessageTime(message.timestamp)}</span>
                </div>
                <div className="pro-thread-message-text">{message.content}</div>
              </div>
            </div>
          ))}
          
          {hiddenCount > 0 && (
            <div className="pro-thread-more" onClick={() => setExpanded(true)}>
              <span>Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}</span>
            </div>
          )}
          
          {!showReplyForm ? (
            <div className="pro-thread-reply-button" onClick={() => setShowReplyForm(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 10 20 15 15 20"></polyline>
                <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
              </svg>
              <span>Reply to thread</span>
            </div>
          ) : (
            <form className="pro-thread-reply-form" onSubmit={handleReplySubmit}>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to this thread..."
                autoFocus
              />
              <div className="pro-thread-reply-actions">
                <button 
                  type="button" 
                  className="pro-thread-reply-cancel"
                  onClick={() => setShowReplyForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="pro-thread-reply-submit"
                  disabled={!replyText.trim()}
                >
                  Reply
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to format message timestamp
const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default MessageThread;
