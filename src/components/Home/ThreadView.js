import React, { useState, useEffect, useRef } from 'react';
import './ThreadView.css';

const ThreadView = ({ 
  parentMessage, 
  threadMessages = [], 
  onSendThreadReply, 
  onClose, 
  currentUser,
  darkMode,
  highContrast
}) => {
  const [replyText, setReplyText] = useState('');
  const threadEndRef = useRef(null);
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date heading
  const formatDateHeading = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };
  
  // Handle sending a reply
  const handleSendReply = () => {
    if (!replyText.trim()) return;
    
    onSendThreadReply(parentMessage.id, replyText);
    setReplyText('');
  };
  
  // Auto scroll to bottom when thread messages change
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    // Include parent message first
    const parentDate = new Date(parentMessage.timestamp).toDateString();
    groups[parentDate] = [parentMessage];
    
    // Group thread replies
    threadMessages.forEach(message => {
      const dateString = new Date(message.timestamp).toDateString();
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(message);
    });
    
    return groups;
  };
  
  const messageGroups = groupMessagesByDate();
  
  return (
    <div className={`thread-view ${darkMode ? 'dark-theme' : ''} ${highContrast ? 'high-contrast-mode' : ''}`}>
      <div className="thread-header">
        <h3>Thread</h3>
        <button className="thread-close-btn" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="thread-content">
        {/* Original message that started the thread */}
        <div className="thread-original-message">
          <div className="thread-info">
            <span>Original message</span>
          </div>
          <div className={`thread-message ${parentMessage.sender.id === currentUser ? 'own-message' : ''}`}>
            <div className="message-avatar">
              <img src={parentMessage.sender.avatar} alt={parentMessage.sender.name} />
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">{parentMessage.sender.name}</span>
                <span className="message-time">{formatTimestamp(parentMessage.timestamp)}</span>
              </div>
              <div className="message-text">{parentMessage.content}</div>
            </div>
          </div>
        </div>
        
        <div className="thread-separator">
          <span>Replies</span>
        </div>
        
        {/* Thread messages */}
        <div className="thread-messages">
          {Object.entries(messageGroups).map(([date, messages], groupIndex) => {
            if (groupIndex === 0 && messages.length <= 1) return null; // Skip parent message
            
            return (
              <div key={date} className="message-date-group">
                <div className="date-heading">
                  <span>{formatDateHeading(messages[0].timestamp)}</span>
                </div>
                
                {messages.map((message, index) => {
                  if (groupIndex === 0 && index === 0) return null; // Skip parent message
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`thread-message ${message.sender.id === currentUser ? 'own-message' : ''}`}
                    >
                      <div className="message-avatar">
                        <img src={message.sender.avatar} alt={message.sender.name} />
                      </div>
                      <div className="message-content">
                        <div className="message-header">
                          <span className="message-sender">{message.sender.name}</span>
                          <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                        </div>
                        <div className="message-text">{message.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div ref={threadEndRef} />
        </div>
      </div>
      
      <div className="thread-reply">
        <input
          type="text"
          className="reply-input"
          placeholder="Reply to thread..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
        />
        <button 
          className={`send-reply-btn ${!replyText.trim() ? 'disabled' : ''}`}
          onClick={handleSendReply}
          disabled={!replyText.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ThreadView;
