import React from 'react';
import './MessageGroup.css';
import MessageReactions from './MessageReactions';

const MessageGroup = ({ 
  messages, 
  currentUser, 
  onOpenThread,
  onAddReaction,
  darkMode,
  highContrast 
}) => {
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Calculate if we should show the timestamp for this message
  const shouldShowTimestamp = (currentMsg, nextMsg) => {
    // Always show timestamp for last message in a group
    if (!nextMsg) return true;
    
    const currentTime = new Date(currentMsg.timestamp);
    const nextTime = new Date(nextMsg.timestamp);
    
    // Show timestamp if messages are more than 2 minutes apart
    return (nextTime - currentTime) > 1000 * 60 * 2;
  };
  
  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  return (
    <div className={`message-group ${darkMode ? 'dark-theme' : ''} ${highContrast ? 'high-contrast-mode' : ''}`}>
      <div className="sender-avatar">
        <img 
          src={messages[0].sender.avatar} 
          alt={messages[0].sender.name} 
          className="avatar-img"
        />
      </div>
      
      <div className="messages-content">
        <div className="sender-name">{messages[0].sender.name}</div>
        
        <div className="grouped-messages">
          {sortedMessages.map((message, index) => {
            const nextMessage = sortedMessages[index + 1];
            const showTimestamp = shouldShowTimestamp(message, nextMessage);
            const hasThread = message.threadCount && message.threadCount > 0;
            
            return (
              <div key={message.id} className="message-wrapper">
                <div className="message-bubble">
                  <div className="message-text">{message.content}</div>
                  
                  {/* Show reactions if any */}
                  {message.reactions && message.reactions.length > 0 && (
                    <MessageReactions
                      reactions={message.reactions}
                      messageId={message.id}
                      onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
                    />
                  )}
                  
                  {/* Thread indicator */}
                  {hasThread && (
                    <div 
                      className="thread-indicator"
                      onClick={() => onOpenThread(message.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>{message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  )}
                </div>
                
                {/* Show timestamp conditionally */}
                {showTimestamp && (
                  <div className="message-timestamp">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
                
                {/* Message actions that appear on hover */}
                <div className="message-actions">
                  <button 
                    className="action-button"
                    onClick={() => onAddReaction(message.id, null)}
                    aria-label="Add reaction"
                  >
                    <span role="img" aria-label="emoji">😀</span>
                  </button>
                  
                  <button 
                    className="action-button"
                    onClick={() => onOpenThread(message.id)}
                    aria-label="Reply in thread"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageGroup;
