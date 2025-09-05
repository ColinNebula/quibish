import React, { useState, useEffect } from 'react';
import './JumpToLatest.css';

const JumpToLatest = ({ 
  onJumpToLatest, 
  unreadCount, 
  messageListRef, 
  lastReadTimestamp,
  avatars = []
}) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (!messageListRef?.current) return;

    let lastScrollTop = 0;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Show when user scrolls up (away from bottom) and there are unread messages
      const scrollingUp = scrollTop < lastScrollTop;
      lastScrollTop = scrollTop;

      setVisible(!isNearBottom && unreadCount > 0 && scrollingUp);
    };

    messageListRef.current.addEventListener('scroll', handleScroll, { passive: true });
    return () => messageListRef.current?.removeEventListener('scroll', handleScroll);
  }, [messageListRef, unreadCount]);

  // Keyboard shortcut: press 'L' to jump to latest
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key.toLowerCase() === 'l') {
        onJumpToLatest();
        setVisible(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onJumpToLatest]);
  
  const handleClick = () => {
    onJumpToLatest();
    // Hide button after jumping
    setVisible(false);
  };
  
  if (!visible) return null;
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="jump-to-latest-container">
      <button className="jump-to-latest-button" onClick={handleClick}>
        <div className="jump-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z" fill="currentColor"/>
          </svg>
        </div>
        
        {unreadCount > 0 && (
          <div className="unread-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        
        {avatars.length > 0 && (
          <div className="read-receipt-avatars">
            {avatars.slice(0, 3).map((avatar, index) => (
              <div 
                key={index} 
                className="receipt-avatar"
                style={{
                  backgroundImage: `url(${avatar.url})`,
                  zIndex: avatars.length - index
                }}
                title={avatar.name}
              />
            ))}
            {avatars.length > 3 && (
              <div className="receipt-avatar more">
                +{avatars.length - 3}
              </div>
            )}
          </div>
        )}
        
        {lastReadTimestamp && (
          <div className="last-read-time">
            Last read at {formatTime(lastReadTimestamp)}
          </div>
        )}
      </button>
    </div>
  );
};

export default JumpToLatest;
