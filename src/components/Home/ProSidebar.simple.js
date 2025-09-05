import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ProUserProfile from './ProUserProfile';
import './ProSidebar.css';

// A refined, professional sidebar with modern icons and smooth interactions
const ProSidebar = ({
  conversations = [],
  onSelectConversation = () => {},
  currentConversation = null,
  collapsed = false,
  onToggleCollapse = () => {},
  darkMode = false,
  onToggleDarkMode = () => {},
  onNewChat = null,
  isMobileView = false,
  onRequestClose = null,
  user = {},
  onLogout = () => {},
  onOpenSettings = () => {},
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isTouch, setIsTouch] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');
  const inputRef = useRef(null);

  // Detect screen size and touch capability
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setScreenSize('mobile-small');
      } else if (width <= 768) {
        setScreenSize('mobile-large');
      } else if (width <= 1024) {
        setScreenSize('tablet');
      } else if (width <= 1440) {
        setScreenSize('desktop');
      } else {
        setScreenSize('desktop-large');
      }
    };

    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    updateScreenSize();
    checkTouch();

    window.addEventListener('resize', updateScreenSize);
    window.addEventListener('orientationchange', updateScreenSize);

    return () => {
      window.removeEventListener('resize', updateScreenSize);
      window.removeEventListener('orientationchange', updateScreenSize);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // If Escape pressed while input focused, clear it
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
        inputRef.current?.blur();
      }
      // Ctrl/Cmd+N to start a new chat
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (onNewChat) onNewChat();
      }
      // Mobile: Escape to close sidebar
      if (e.key === 'Escape' && (isMobileView || screenSize.includes('mobile')) && onRequestClose) {
        onRequestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNewChat, isMobileView, onRequestClose, screenSize]);

  const filtered = conversations.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.lastMessage?.text || '').toLowerCase().includes(q);
  });

  const highlight = useCallback((text = '') => {
    if (!query) return text;
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${q})`, 'ig'));
    return parts.map((part, i) => (
      part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
    ));
  }, [query]);

  const safeAvatar = (e) => { 
    e.target.onerror = null; 
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0yMCAyMXYtMmE0IDQgMCAwIDAtNC00SDhhNCA0IDAgMCAwLTQgNHYyIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+'; 
  };

  const handleSelect = useCallback((conv) => {
    onSelectConversation(conv);
    // Auto-close sidebar on mobile after selection
    if ((screenSize.includes('mobile') || isMobileView) && onRequestClose) {
      setTimeout(() => onRequestClose(), 150);
    }
  }, [onSelectConversation, screenSize, isMobileView, onRequestClose]);

  const handleNewChat = useCallback(() => { 
    if (onNewChat) onNewChat(); 
    // Auto-close sidebar on mobile after new chat
    if ((screenSize.includes('mobile') || isMobileView) && onRequestClose) {
      setTimeout(() => onRequestClose(), 150);
    }
  }, [onNewChat, screenSize, isMobileView, onRequestClose]);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  // Touch handling for mobile swipe gestures
  const handleTouchStart = useCallback((e) => {
    if (!isTouch || !screenSize.includes('mobile')) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (moveEvent) => {
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - startX;
      
      // Swipe left to close sidebar
      if (deltaX < -50 && onRequestClose) {
        onRequestClose();
      }
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [isTouch, screenSize, onRequestClose]);

  return (
    <div 
      className={`pro-sidebar pro-sidebar-root ${collapsed ? 'collapsed' : ''} ${screenSize} ${isTouch ? 'touch-device' : ''} ${className}`}
      onTouchStart={handleTouchStart}
    >
      <div className="pro-sidebar-header">
        <h1 className="pro-sidebar-title">QuibiChat</h1>
        {(isMobileView || screenSize.includes('mobile')) && (
          <button type="button" className="pro-mobile-close" onClick={() => onRequestClose && onRequestClose()} aria-label="Close sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        <div className="pro-sidebar-actions">
          <button type="button" className="pro-theme-toggle" onClick={onToggleDarkMode} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>

          <button type="button" className="pro-sidebar-toggle" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="11 17 6 12 11 7"></polyline>
              </svg>
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="pro-sidebar-search-container">
            <div className="pro-sidebar-search">
              <span className="pro-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input 
                ref={inputRef} 
                className="pro-search-input" 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                placeholder="Search conversations..." 
                aria-label="Search conversations"
                onKeyDown={(e) => { 
                  if (e.key === 'Escape') { 
                    handleClearSearch(); 
                  } 
                }}
              />
              {query && (
                <button type="button" className="pro-search-clear" onClick={handleClearSearch} aria-label="Clear search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="pro-conversations-list">
            {filtered.length === 0 && (
              <div className="pro-no-results">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{opacity: 0.4, marginBottom: '8px'}}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p style={{margin: 0, fontSize: '14px'}}>
                  {query ? 'No conversations match your search' : 'No conversations'}
                </p>
              </div>
            )}
            {filtered.map(conv => (
              <div
                key={conv.id}
                className={`pro-conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => handleSelect(conv)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(conv); } }}
                tabIndex={0}
                role="button"
                aria-pressed={currentConversation?.id === conv.id}
              >
                <div className="pro-conversation-avatar">
                  <img src={conv.avatar} alt={conv.name} loading="lazy" onError={safeAvatar} />
                  {conv.status && !conv.isGroup && (
                    <div className={`status-indicator ${conv.status}`} title={conv.status}></div>
                  )}
                  {conv.isPinned && (
                    <div className="pinned-indicator" title="Pinned conversation">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="pro-conversation-details">
                  <div className="pro-conversation-header">
                    <h3 className="pro-conversation-name">
                      {highlight(conv.name)}
                      {conv.isGroup && conv.members && (
                        <span className="member-count" title={`${conv.members} members`}>
                          ({conv.members})
                        </span>
                      )}
                    </h3>
                    <div className="pro-conversation-time">
                      {conv.lastMessage?.time}
                      {conv.unread > 0 && (
                        <span className="pro-unread-badge" aria-label={`${conv.unread} unread messages`}>
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pro-conversation-preview">
                    {conv.isTyping ? (
                      <div className="typing-indicator">
                        <span className="typing-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                        <span className="typing-text">
                          {conv.typingUsers ? `${conv.typingUsers.join(', ')} typing...` : 'typing...'}
                        </span>
                      </div>
                    ) : (
                      highlight(conv.lastMessage?.text)
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pro-sidebar-footer">
            <button type="button" className="pro-new-chat-button" onClick={handleNewChat} aria-label="Start new chat (Ctrl/Cmd+N)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New Chat</span>
            </button>
          </div>
        </>
      )}

      {/* Collapsed state footer */}
      {collapsed && (
        <div className="pro-sidebar-footer">
          <button type="button" className="pro-new-chat-button" onClick={handleNewChat} aria-label="Start new chat (Ctrl/Cmd+N)" title="New Chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      )}

        {/* Announce result count for screen readers */}
        <div aria-live="polite" style={{position: 'absolute', left: -9999}}>{filtered.length} conversations</div>

        <ProUserProfile user={user} collapsed={collapsed} darkMode={darkMode} onLogout={onLogout} onOpenSettings={onOpenSettings} />
    </div>
  );
};

ProSidebar.propTypes = {
  conversations: PropTypes.array,
  onSelectConversation: PropTypes.func,
  currentConversation: PropTypes.object,
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
  darkMode: PropTypes.bool,
  onToggleDarkMode: PropTypes.func,
  onNewChat: PropTypes.func,
  isMobileView: PropTypes.bool,
  onRequestClose: PropTypes.func,
  user: PropTypes.object,
  onLogout: PropTypes.func,
  onOpenSettings: PropTypes.func,
  className: PropTypes.string
};

export default React.memo(ProSidebar);
