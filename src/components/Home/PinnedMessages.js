import React, { useState } from 'react';
import './PinnedMessages.css';

const PinnedMessages = ({ pinnedMessages, onMessageClick, currentUser }) => {
  const [expanded, setExpanded] = useState(false);

  // keyboard: Enter or Space toggles expansion when header focused
  const onHeaderKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded(prev => !prev);
    }
  };

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format: Today at 10:30 AM, Yesterday at 4:45 PM, or Mar 15 at 2:15 PM
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
  };

  return (
    <div className={`pinned-messages-container ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="pinned-header" onClick={toggleExpand} role="button" tabIndex={0} onKeyDown={onHeaderKey} aria-expanded={expanded} aria-controls="pinned-list">
        <div className="pinned-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4zm-6 8h8c0 1.1-.9 2-2 2H6c-.55 0-1-.45-1-1s.45-1 1-1zm3 5h2v5l-1-1-1 1v-5z" 
              fill="currentColor"/>
          </svg>
        </div>
        <div className="pinned-title">
          {pinnedMessages.length} Pinned {pinnedMessages.length === 1 ? 'Message' : 'Messages'}
        </div>
  <div className="pinned-toggle" aria-hidden>
          {expanded ? 
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"/>
            </svg>
            :
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/>
            </svg>
          }
        </div>
      </div>
      
      {expanded && (
        <div id="pinned-list" className="pinned-messages-list">
          {pinnedMessages.map(message => (
            <div 
              key={message.id} 
              className="pinned-message-item"
              onClick={() => onMessageClick(message.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onMessageClick(message.id); }}
            >
              <div className="pinned-message-sender">
                {message.sender.id === currentUser ? 'You' : message.sender.name}
              </div>
              <div className="pinned-message-content">
                {message.content}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="pinned-attachment-indicator">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" 
                      fill="currentColor"/>
                    </svg>
                    {message.attachments.length} {message.attachments.length === 1 ? 'attachment' : 'attachments'}
                  </div>
                )}
              </div>
              <div className="pinned-message-time">
                {formatTimestamp(message.timestamp)}
              </div>
              <div className="pinned-message-actions">
                <button className="pinned-action" onClick={(e) => { e.stopPropagation(); onMessageClick(message.id); }} aria-label={`Jump to pinned message ${message.id}`}>Jump</button>
                <button className="pinned-action" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(message.content || '') }} aria-label={`Copy pinned message ${message.id}`}>Copy</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Collapsed preview showing most recent pinned message */}
      {!expanded && pinnedMessages.length > 0 && (
        <div className="pinned-preview" aria-hidden>
          <div className="pinned-preview-text">{pinnedMessages[0].content.substring(0, 80)}{pinnedMessages[0].content.length > 80 ? '…' : ''}</div>
        </div>
      )}
    </div>
  );
};

export default PinnedMessages;
