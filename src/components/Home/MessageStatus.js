import React from 'react';

/**
 * MessageStatus component displays delivery/read status of messages
 */
const MessageStatus = ({ status, timestamp }) => {
  // Format time display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render appropriate status icon
  const renderStatusIcon = () => {
    switch(status) {
      case 'sending':
        return (
          <svg className="status-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
              <animateTransform 
                attributeName="transform" 
                attributeType="XML" 
                type="rotate"
                dur="1s" 
                from="0 12 12"
                to="360 12 12" 
                repeatCount="indefinite" />
            </path>
          </svg>
        );
      case 'sent':
        return (
          <svg className="status-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41-1.41L9,16.17z"/>
          </svg>
        );
      case 'delivered':
        return (
          <svg className="status-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M18,7l-1.41-1.41-6.34,6.34L7.83,9.51,6.41,10.92,10.25,14.75 18,7z M4.16,4.16A9,9,0,0,0,12,21a9,9,0,0,0,9-9A9,9,0,0,0,4.16,4.16ZM12,19a7,7,0,1,1,7-7A7,7,0,0,1,12,19Z"/>
          </svg>
        );
      case 'read':
        return (
          <svg className="status-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M18,7l-1.41-1.41-6.34,6.34L7.83,9.51,6.41,10.92,10.25,14.75 18,7z M4.16,4.16A9,9,0,0,0,12,21a9,9,0,0,0,9-9A9,9,0,0,0,4.16,4.16ZM12,19a7,7,0,1,1,7-7A7,7,0,0,1,12,19Z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`message-status status-${status}`}>
      {renderStatusIcon()}
      <span className="status-time">{formatTime(timestamp)}</span>
    </div>
  );
};

export default MessageStatus;
