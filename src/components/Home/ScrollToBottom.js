import React, { useState, useEffect } from 'react';
import './MessageInteractions.css';

const ScrollToBottom = ({ messagesContainerRef, messagesEndRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!messagesContainerRef?.current) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      
      // If we're more than 300px from the bottom, show the button
      if (scrollPosition > 300) {
        setIsVisible(true);
        
        // Calculate approximate number of unread messages
        // This is a simple approximation (assumes average message height of 60px)
        const approximateMessagesNotVisible = Math.floor(scrollPosition / 60);
        setUnreadCount(approximateMessagesNotVisible);
      } else {
        setIsVisible(false);
        setUnreadCount(0);
      }
    };

    const container = messagesContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messagesContainerRef]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button 
      className={`pro-scroll-to-bottom ${isVisible ? 'visible' : ''}`}
      onClick={scrollToBottom}
      title="Scroll to bottom"
      aria-label="Scroll to bottom"
    >
      {unreadCount > 0 ? (
        <>
          <span className="pro-unread-badge">{unreadCount}</span>
          <span className="pro-scroll-icon">↓</span>
        </>
      ) : (
        <span className="pro-scroll-icon">↓</span>
      )}
    </button>
  );
};

export default ScrollToBottom;
